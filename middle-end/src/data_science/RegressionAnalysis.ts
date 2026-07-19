import { DataPacket, PacketMeta } from '../shared/types';

export interface RegressionModel {
  type: string;
  coefficients: number[];
  rSquared: number;
  residuals: number[];
}

export interface RegressionResult {
  model: RegressionModel;
  predictions: number[];
  fitted: number[];
  metrics: Record<string, number>;
}

export class RegressionAnalysis {
  private _models: Map<string, RegressionModel> = new Map();
  private _results: RegressionResult[] = [];
  private _counter = 0;

  linearRegression(X: number[][], y: number[]): RegressionResult {
    const n = X.length;
    const d = X[0]?.length ?? 0;
    const XwithBias = X.map(row => [1, ...row]);
    const Xt = this._transpose(XwithBias);
    const XtX = this._matrixMultiply(Xt, XwithBias);
    const Xty = this._matVec(Xt, y);
    const coefs = this._solveLinear(XtX, Xty);
    const fitted = XwithBias.map(row => this._dot(row, coefs));
    const residuals = y.map((yi, i) => yi - fitted[i]);
    const ssTot = y.reduce((s, yi) => s + Math.pow(yi - this._mean(y), 2), 0);
    const ssRes = residuals.reduce((s, r) => s + r * r, 0);
    const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    const model: RegressionModel = { type: 'linear', coefficients: coefs, rSquared: r2, residuals };
    this._models.set(`linear-${++this._counter}`, model);
    const result: RegressionResult = { model, predictions: fitted, fitted, metrics: { r2, mse: ssRes / n, rmse: Math.sqrt(ssRes / n) } };
    this._results.push(result);
    return result;
  }

  multipleRegression(X: number[][], y: number[]): RegressionResult {
    return this.linearRegression(X, y);
  }

  polynomialRegression(X: number[][], y: number[], degree: number = 2): RegressionResult {
    const polyX = X.map(row => {
      const result: number[] = [];
      for (const val of row) {
        for (let d = 1; d <= degree; d++) result.push(Math.pow(val, d));
      }
      return result;
    });
    return this.linearRegression(polyX, y);
  }

  logisticRegression(X: number[][], y: number[]): RegressionResult {
    const n = X.length;
    const d = X[0]?.length ?? 0;
    const XwithBias = X.map(row => [1, ...row]);
    let theta = new Array(d + 1).fill(0);
    const lr = 0.01;
    const iterations = 200;
    for (let iter = 0; iter < iterations; iter++) {
      const grad = new Array(d + 1).fill(0);
      for (let i = 0; i < n; i++) {
        const pred = this._sigmoid(this._dot(XwithBias[i], theta));
        const err = pred - y[i];
        for (let j = 0; j <= d; j++) grad[j] += err * XwithBias[i][j];
      }
      for (let j = 0; j <= d; j++) theta[j] -= lr * grad[j] / n;
    }
    const probs = XwithBias.map(row => this._sigmoid(this._dot(row, theta)));
    const preds = probs.map(p => p >= 0.5 ? 1 : 0);
    const residuals = y.map((yi, i) => yi - probs[i]);
    const correct = preds.filter((p, i) => p === y[i]).length;
    const accuracy = n > 0 ? correct / n : 0;
    const model: RegressionModel = { type: 'logistic', coefficients: theta, rSquared: accuracy, residuals };
    this._models.set(`logistic-${++this._counter}`, model);
    const result: RegressionResult = { model, predictions: preds, fitted: probs, metrics: { accuracy, precision: 0, recall: 0 } };
    this._results.push(result);
    return result;
  }

  ridgeRegression(X: number[][], y: number[], alpha: number = 1): RegressionResult {
    const n = X.length;
    const d = X[0]?.length ?? 0;
    const XwithBias = X.map(row => [1, ...row]);
    const Xt = this._transpose(XwithBias);
    const XtX = this._matrixMultiply(Xt, XwithBias);
    for (let i = 1; i <= d; i++) XtX[i][i] += alpha;
    const Xty = this._matVec(Xt, y);
    const coefs = this._solveLinear(XtX, Xty);
    const fitted = XwithBias.map(row => this._dot(row, coefs));
    const residuals = y.map((yi, i) => yi - fitted[i]);
    const ssTot = y.reduce((s, yi) => s + Math.pow(yi - this._mean(y), 2), 0);
    const ssRes = residuals.reduce((s, r) => s + r * r, 0);
    const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    const model: RegressionModel = { type: 'ridge', coefficients: coefs, rSquared: r2, residuals };
    this._models.set(`ridge-${++this._counter}`, model);
    const result: RegressionResult = { model, predictions: fitted, fitted, metrics: { r2, alpha, mse: ssRes / n } };
    this._results.push(result);
    return result;
  }

  lassoRegression(X: number[][], y: number[], alpha: number = 1): RegressionResult {
    const n = X.length;
    const d = X[0]?.length ?? 0;
    const XwithBias = X.map(row => [1, ...row]);
    let theta = new Array(d + 1).fill(0);
    const lr = 0.005;
    const iterations = 500;
    for (let iter = 0; iter < iterations; iter++) {
      const grad = new Array(d + 1).fill(0);
      for (let i = 0; i < n; i++) {
        const pred = this._dot(XwithBias[i], theta);
        const err = pred - y[i];
        for (let j = 0; j <= d; j++) grad[j] += err * XwithBias[i][j];
      }
      for (let j = 0; j <= d; j++) {
        theta[j] -= lr * (grad[j] / n + alpha * Math.sign(theta[j]));
      }
    }
    const fitted = XwithBias.map(row => this._dot(row, theta));
    const residuals = y.map((yi, i) => yi - fitted[i]);
    const ssTot = y.reduce((s, yi) => s + Math.pow(yi - this._mean(y), 2), 0);
    const ssRes = residuals.reduce((s, r) => s + r * r, 0);
    const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    const model: RegressionModel = { type: 'lasso', coefficients: theta, rSquared: r2, residuals };
    this._models.set(`lasso-${++this._counter}`, model);
    const result: RegressionResult = { model, predictions: fitted, fitted, metrics: { r2, alpha, mse: ssRes / n } };
    this._results.push(result);
    return result;
  }

  elasticNet(X: number[][], y: number[], alpha: number = 1, ratio: number = 0.5): RegressionResult {
    const n = X.length;
    const d = X[0]?.length ?? 0;
    const XwithBias = X.map(row => [1, ...row]);
    let theta = new Array(d + 1).fill(0);
    const lr = 0.005;
    const iterations = 500;
    const l1 = alpha * ratio;
    const l2 = alpha * (1 - ratio);
    for (let iter = 0; iter < iterations; iter++) {
      const grad = new Array(d + 1).fill(0);
      for (let i = 0; i < n; i++) {
        const pred = this._dot(XwithBias[i], theta);
        const err = pred - y[i];
        for (let j = 0; j <= d; j++) grad[j] += err * XwithBias[i][j];
      }
      for (let j = 0; j <= d; j++) {
        theta[j] -= lr * (grad[j] / n + l1 * Math.sign(theta[j]) + l2 * theta[j]);
      }
    }
    const fitted = XwithBias.map(row => this._dot(row, theta));
    const residuals = y.map((yi, i) => yi - fitted[i]);
    const ssTot = y.reduce((s, yi) => s + Math.pow(yi - this._mean(y), 2), 0);
    const ssRes = residuals.reduce((s, r) => s + r * r, 0);
    const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    const model: RegressionModel = { type: 'elastic_net', coefficients: theta, rSquared: r2, residuals };
    this._models.set(`elastic-${++this._counter}`, model);
    const result: RegressionResult = { model, predictions: fitted, fitted, metrics: { r2, alpha, ratio, mse: ssRes / n } };
    this._results.push(result);
    return result;
  }

  stepwiseRegression(X: number[][], y: number[], method: string = 'both', direction: string = 'forward'): RegressionResult {
    return this.linearRegression(X, y);
  }

  regressionDiagnostics(model: RegressionModel): Record<string, number> {
    const { residuals, coefficients } = model;
    const n = residuals.length;
    const p = coefficients.length;
    const ssRes = residuals.reduce((s, r) => s + r * r, 0);
    const mse = ssRes / (n - p);
    const rmse = Math.sqrt(mse);
    const mae = residuals.reduce((s, r) => s + Math.abs(r), 0) / n;
    const meanRes = residuals.reduce((s, r) => s + r, 0) / n;
    return { mse, rmse, mae, meanResidual: meanRes, df: n - p };
  }

  rSquared(model: RegressionModel): number {
    return model.rSquared;
  }

  adjustedRSquared(model: RegressionModel, n: number, p: number): number {
    const r2 = model.rSquared;
    if (n - p - 1 <= 0) return r2;
    return 1 - (1 - r2) * (n - 1) / (n - p - 1);
  }

  residualAnalysis(model: RegressionModel): Record<string, number> {
    const { residuals } = model;
    const n = residuals.length;
    const mean = residuals.reduce((s, r) => s + r, 0) / n;
    const std = Math.sqrt(residuals.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / n);
    const skewness = residuals.reduce((s, r) => s + Math.pow((r - mean) / std, 3), 0) / n;
    const kurtosis = residuals.reduce((s, r) => s + Math.pow((r - mean) / std, 4), 0) / n - 3;
    return { mean, std, skewness, kurtosis, min: Math.min(...residuals), max: Math.max(...residuals) };
  }

  multicollinearity(X: number[][]): number[] {
    return this.vif(X);
  }

  vif(X: number[][]): number[] {
    const d = X[0]?.length ?? 0;
    const vifs: number[] = [];
    for (let i = 0; i < d; i++) {
      const y = X.map(row => row[i]);
      const others = X.map(row => row.filter((_, j) => j !== i));
      const result = this.linearRegression(others, y);
      const r2 = result.model.rSquared;
      vifs.push(r2 >= 1 ? Infinity : 1 / (1 - r2));
    }
    return vifs;
  }

  cookDistance(model: RegressionModel): number[] {
    const { residuals, coefficients } = model;
    const n = residuals.length;
    const p = coefficients.length;
    const mse = residuals.reduce((s, r) => s + r * r, 0) / (n - p);
    return residuals.map((r, i) => {
      const h = 1 / n + 1 / (n * p);
      return (r * r * h) / (p * mse * Math.pow(1 - h, 2));
    });
  }

  private _sigmoid(x: number): number { return 1 / (1 + Math.exp(-x)); }
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

  toPacket(): DataPacket<{
    models: Map<string, RegressionModel>;
    results: RegressionResult[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['data_science', 'RegressionAnalysis'],
      priority: 1,
      phase: 'regression_analysis',
    };
    return {
      id: `regression-analysis-${Date.now().toString(36)}`,
      payload: {
        models: this._models,
        results: this._results,
      },
      metadata,
    };
  }

  reset(): void {
    this._models = new Map();
    this._results = [];
    this._counter = 0;
  }

  get modelCount(): number { return this._models.size; }
  get resultCount(): number { return this._results.length; }
}
