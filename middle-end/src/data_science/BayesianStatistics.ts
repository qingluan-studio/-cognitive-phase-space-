import { DataPacket, PacketMeta } from '../shared/types';

export interface BayesianModel {
  prior: number[];
  likelihood: number[];
  posterior: number[];
  params: Record<string, number>;
}

export interface PriorDistribution {
  type: string;
  params: Record<string, number>;
  samples: number[];
}

export class BayesianStatistics {
  private _models: Map<string, BayesianModel> = new Map();
  private _priors: PriorDistribution[] = [];
  private _counter = 0;

  bayesTheorem(prior: number, likelihood: number, evidence: number): number {
    return evidence > 0 ? (likelihood * prior) / evidence : 0;
  }

  conjugatePrior(prior: { type: string; params: Record<string, number> }, data: number[], distribution: string): Posterior {
    const n = data.length;
    const result: Posterior = { type: prior.type, params: { ...prior.params } };
    if (distribution === 'normal' && prior.type === 'normal') {
      const mean = data.reduce((s, v) => s + v, 0) / n;
      const priorMean = prior.params.mean || 0;
      const priorVar = prior.params.variance || 1;
      const dataVar = prior.params.dataVariance || 1;
      const postVar = 1 / (1 / priorVar + n / dataVar);
      const postMean = postVar * (priorMean / priorVar + n * mean / dataVar);
      result.params.mean = postMean;
      result.params.variance = postVar;
    }
    return result;
  }

  posteriorDistribution(prior: number[], likelihood: number[], data: number[]): number[] {
    const n = Math.min(prior.length, likelihood.length);
    const posterior = new Array(n).fill(0);
    let total = 0;
    for (let i = 0; i < n; i++) {
      posterior[i] = prior[i] * likelihood[i];
      total += posterior[i];
    }
    if (total > 0) {
      for (let i = 0; i < n; i++) posterior[i] /= total;
    }
    const model: BayesianModel = { prior, likelihood, posterior, params: { n: data.length } };
    this._models.set(`posterior-${++this._counter}`, model);
    return posterior;
  }

  credibleInterval(posterior: number[], level: number = 0.95): [number, number] {
    const sorted = [...posterior].sort((a, b) => a - b);
    const n = sorted.length;
    const alpha = (1 - level) / 2;
    const lowerIdx = Math.floor(n * alpha);
    const upperIdx = Math.floor(n * (1 - alpha));
    return [sorted[lowerIdx], sorted[Math.min(upperIdx, n - 1)]];
  }

  bayesianLinearRegression(X: number[][], y: number[], priors: { mean: number[]; variance: number }): { coefficients: number[]; variance: number } {
    const n = X.length;
    const d = X[0]?.length ?? 0;
    const XwithBias = X.map(row => [1, ...row]);
    const priorMean = new Array(d + 1).fill(priors.mean?.[0] || 0);
    const priorVar = priors.variance || 10;
    const precision = 1 / priorVar;
    const Xt = this._transpose(XwithBias);
    const XtX = this._matrixMultiply(Xt, XwithBias);
    const Xty = this._matVec(Xt, y);
    const A = XtX.map(row => row.map(v => v + precision));
    const b = Xty.map((v, i) => v + precision * priorMean[i]);
    const coefs = this._solveLinear(A, b);
    const residuals = y.map((yi, i) => yi - this._dot(XwithBias[i], coefs));
    const mse = residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, n - d - 1);
    return { coefficients: coefs, variance: mse };
  }

  metropolisHastings(target: (x: number) => number, proposal: (x: number) => number, iterations: number): number[] {
    const samples: number[] = [];
    let current = 0;
    let currentProb = target(current);
    for (let i = 0; i < iterations; i++) {
      const candidate = current + proposal(current);
      const candidateProb = target(candidate);
      const acceptance = candidateProb / currentProb;
      if (Math.random() < acceptance) {
        current = candidate;
        currentProb = candidateProb;
      }
      if (i > iterations / 2) samples.push(current);
    }
    return samples;
  }

  gibbsSampling(params: string[], conditionals: Record<string, (others: Record<string, number>) => number>, iterations: number): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    const state: Record<string, number> = {};
    for (const p of params) {
      result[p] = [];
      state[p] = 0;
    }
    for (let i = 0; i < iterations; i++) {
      for (const p of params) {
        state[p] = conditionals[p](state);
      }
      if (i > iterations / 2) {
        for (const p of params) result[p].push(state[p]);
      }
    }
    return result;
  }

  mcmcDiagnostics(samples: number[]): { mean: number; std: number; ess: number; rHat: number } {
    const n = samples.length;
    if (n < 2) return { mean: 0, std: 0, ess: 0, rHat: 1 };
    const mean = samples.reduce((s, v) => s + v, 0) / n;
    const std = Math.sqrt(samples.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n);
    let autocorr = 0;
    for (let lag = 1; lag < Math.min(100, n); lag++) {
      let corr = 0;
      for (let i = lag; i < n; i++) {
        corr += (samples[i] - mean) * (samples[i - lag] - mean);
      }
      corr /= (n - lag) * std * std;
      if (corr < 0.05) break;
      autocorr += corr;
    }
    const ess = n / (1 + 2 * autocorr);
    return { mean, std, ess, rHat: 1 + 1 / Math.max(ess, 1) };
  }

  gelmanRubin(chains: number[][]): number {
    const m = chains.length;
    const n = chains[0]?.length ?? 0;
    if (m < 2 || n < 2) return 1;
    const chainMeans = chains.map(c => c.reduce((s, v) => s + v, 0) / c.length);
    const chainVars = chains.map(c => {
      const m2 = c.reduce((s, v) => s + v, 0) / c.length;
      return c.reduce((s, v) => s + Math.pow(v - m2, 2), 0) / (c.length - 1);
    });
    const grandMean = chainMeans.reduce((s, v) => s + v, 0) / m;
    const B = n / (m - 1) * chainMeans.reduce((s, v) => s + Math.pow(v - grandMean, 2), 0);
    const W = chainVars.reduce((s, v) => s + v, 0) / m;
    const varHat = (1 - 1 / n) * W + (1 / n) * B;
    return W > 0 ? Math.sqrt(varHat / W) : 1;
  }

  bayesFactor(model1: { prior: number; likelihood: number }, model2: { prior: number; likelihood: number }, data: number[]): number {
    const marg1 = model1.likelihood * model1.prior;
    const marg2 = model2.likelihood * model2.prior;
    return marg2 > 0 ? marg1 / marg2 : 0;
  }

  hierarchicalModel(data: number[][], levels: number): { groupMeans: number[]; grandMean: number; variance: number } {
    const J = data.length;
    const groupMeans = data.map(g => g.reduce((s, v) => s + v, 0) / g.length);
    const grandMean = groupMeans.reduce((s, v) => s + v, 0) / J;
    const betweenVar = groupMeans.reduce((s, v) => s + Math.pow(v - grandMean, 2), 0) / (J - 1);
    const withinVar = data.reduce((s, g) => {
      const gm = g.reduce((ss, v) => ss + v, 0) / g.length;
      return s + g.reduce((ss, v) => ss + Math.pow(v - gm, 2), 0) / (g.length - 1);
    }, 0) / J;
    return { groupMeans, grandMean, variance: betweenVar + withinVar };
  }

  empiricalBayes(data: number[], prior: { type: string }): { params: Record<string, number>; posterior: number[] } {
    const n = data.length;
    const mean = data.reduce((s, v) => s + v, 0) / n;
    const variance = data.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / Math.max(1, n - 1);
    const params: Record<string, number> = { mean, variance };
    const posterior = data.map(v => (v - mean) / Math.sqrt(variance));
    return { params, posterior };
  }

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
    models: Map<string, BayesianModel>;
    priors: PriorDistribution[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['data_science', 'BayesianStatistics'],
      priority: 1,
      phase: 'bayesian_statistics',
    };
    return {
      id: `bayesian-${Date.now().toString(36)}`,
      payload: {
        models: this._models,
        priors: this._priors,
      },
      metadata,
    };
  }

  reset(): void {
    this._models = new Map();
    this._priors = [];
    this._counter = 0;
  }

  get modelCount(): number { return this._models.size; }
  get priorCount(): number { return this._priors.length; }
}

interface Posterior {
  type: string;
  params: Record<string, number>;
}
