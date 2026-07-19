import { DataPacket, PacketMeta } from '../shared/types';

/** Probability of a single event. */
export interface Probability {
  event: string;
  sampleSpace: number;
  probability: number;
  odds: string;
}

/** Type of probability distribution. */
export type DistributionType = 'uniform' | 'binomial' | 'normal' | 'poisson';

/** Distribution representation. */
export interface Distribution {
  type: DistributionType;
  parameters: Map<string, number>;
  mean: number;
  variance: number;
}

/** Summary statistics for a dataset. */
export interface StatisticalSummary {
  mean: number;
  median: number;
  mode: number[];
  range: number;
  variance: number;
  stdDev: number;
  quartiles: { Q1: number; Q2: number; Q3: number; IQR: number };
}

export class ProbabilityStatistics {
  private _probabilities: Probability[] = [];
  private _distributions: Map<string, Distribution> = new Map();
  private _dataSets: number[][] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  basicProbability(favorable: number, total: number): number {
    if (total === 0) return 0;
    const p = favorable / total;
    const odds = p === 1 ? '∞:1' : `${favorable}:${total - favorable}`;
    const prob: Probability = {
      event: `${favorable} of ${total}`,
      sampleSpace: total,
      probability: p,
      odds,
    };
    this._probabilities.push(prob);
    this._history.push({ op: 'basicProbability', p });
    return p;
  }

  conditionalProbability(A: number, B: number, given: number): number {
    if (given === 0) return 0;
    return A * B / given;
  }

  bayesTheorem(prior: number, likelihood: number, evidence: number): number {
    if (evidence === 0) return 0;
    return prior * likelihood / evidence;
  }

  permutations(n: number, r: number): number {
    if (r > n) return 0;
    let result = 1;
    for (let i = 0; i < r; i++) result *= (n - i);
    return result;
  }

  combinations(n: number, r: number): number {
    if (r > n || r < 0) return 0;
    if (r === 0 || r === n) return 1;
    r = Math.min(r, n - r);
    let num = 1;
    let den = 1;
    for (let i = 0; i < r; i++) {
      num *= (n - i);
      den *= (i + 1);
    }
    return num / den;
  }

  binomialProbability(n: number, k: number, p: number): number {
    if (k < 0 || k > n || p < 0 || p > 1) return 0;
    const comb = this.combinations(n, k);
    return comb * Math.pow(p, k) * Math.pow(1 - p, n - k);
  }

  geometricProbability(p: number, k: number): number {
    if (p <= 0 || p > 1 || k < 1) return 0;
    return Math.pow(1 - p, k - 1) * p;
  }

  poissonProbability(lambda: number, k: number): number {
    if (lambda < 0 || k < 0) return 0;
    let factorial = 1;
    for (let i = 2; i <= k; i++) factorial *= i;
    return Math.pow(lambda, k) * Math.exp(-lambda) / factorial;
  }

  normalProbability(x: number, mean: number, stdDev: number): number {
    if (stdDev <= 0) return 0;
    const z = (x - mean) / stdDev;
    return 0.5 * (1 + this._erf(z / Math.sqrt(2)));
  }

  expectedValue(values: number[], probabilities: number[]): number {
    if (values.length !== probabilities.length) return 0;
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += values[i] * probabilities[i];
    }
    return sum;
  }

  variance(values: number[], probabilities: number[]): number {
    if (values.length !== probabilities.length) return 0;
    const mean = this.expectedValue(values, probabilities);
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += probabilities[i] * (values[i] - mean) ** 2;
    }
    return sum;
  }

  summary(data: number[]): StatisticalSummary {
    if (data.length === 0) {
      return {
        mean: 0, median: 0, mode: [], range: 0, variance: 0, stdDev: 0,
        quartiles: { Q1: 0, Q2: 0, Q3: 0, IQR: 0 },
      };
    }
    const sorted = [...data].sort((a, b) => a - b);
    const mean = data.reduce((s, v) => s + v, 0) / data.length;
    const median = this._median(sorted);
    const mode = this._mode(data);
    const range = sorted[sorted.length - 1] - sorted[0];
    const variance = data.reduce((s, v) => s + (v - mean) ** 2, 0) / data.length;
    const stdDev = Math.sqrt(variance);
    const q = this.quartiles(data);
    const result: StatisticalSummary = {
      mean, median, mode, range, variance, stdDev, quartiles: q,
    };
    this._dataSets.push([...data]);
    this._history.push({ op: 'summary', result });
    return result;
  }

  quartiles(data: number[]): { Q1: number; Q2: number; Q3: number; IQR: number } {
    if (data.length === 0) return { Q1: 0, Q2: 0, Q3: 0, IQR: 0 };
    const sorted = [...data].sort((a, b) => a - b);
    const Q2 = this._median(sorted);
    const mid = Math.floor(sorted.length / 2);
    const lower = sorted.slice(0, mid);
    const upper = sorted.length % 2 === 0 ? sorted.slice(mid) : sorted.slice(mid + 1);
    const Q1 = lower.length ? this._median(lower) : Q2;
    const Q3 = upper.length ? this._median(upper) : Q2;
    return { Q1, Q2, Q3, IQR: Q3 - Q1 };
  }

  correlation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    const n = x.length;
    const mx = x.reduce((s, v) => s + v, 0) / n;
    const my = y.reduce((s, v) => s + v, 0) / n;
    let num = 0;
    let dx = 0;
    let dy = 0;
    for (let i = 0; i < n; i++) {
      num += (x[i] - mx) * (y[i] - my);
      dx += (x[i] - mx) ** 2;
      dy += (y[i] - my) ** 2;
    }
    const denom = Math.sqrt(dx * dy);
    if (denom === 0) return 0;
    return num / denom;
  }

  linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
    if (x.length !== y.length || x.length === 0) {
      return { slope: 0, intercept: 0, r2: 0 };
    }
    const n = x.length;
    const mx = x.reduce((s, v) => s + v, 0) / n;
    const my = y.reduce((s, v) => s + v, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (x[i] - mx) * (y[i] - my);
      den += (x[i] - mx) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = my - slope * mx;
    const r = this.correlation(x, y);
    const r2 = r * r;
    const result = { slope, intercept, r2 };
    this._history.push({ op: 'linearRegression', result });
    return result;
  }

  /** Compute the standard error of the mean for a sample. */
  standardError(data: number[]): number {
    if (data.length === 0) return 0;
    const summary = this.summary(data);
    return summary.stdDev / Math.sqrt(data.length);
  }

  /** Determine whether two events A and B are independent given P(A∩B) and P(A)P(B). */
  areIndependent(pAB: number, pA: number, pB: number): boolean {
    if (pA < 0 || pA > 1 || pB < 0 || pB > 1) return false;
    return Math.abs(pAB - pA * pB) < 1e-9;
  }

  /** Determine whether two events A and B are mutually exclusive given P(A∩B). */
  areMutuallyExclusive(pAB: number): boolean {
    return Math.abs(pAB) < 1e-12;
  }

  /** Hypergeometric probability mass function. */
  hypergeometricProbability(N: number, K: number, n: number, k: number): number {
    if (k < 0 || k > K || k > n || n - k > N - K) return 0;
    const c1 = this.combinations(K, k);
    const c2 = this.combinations(N - K, n - k);
    const c3 = this.combinations(N, n);
    if (c3 === 0) return 0;
    return (c1 * c2) / c3;
  }

  /** Negative binomial probability mass function. */
  negativeBinomialProbability(r: number, k: number, p: number): number {
    if (k < 0 || r <= 0 || p <= 0 || p > 1) return 0;
    const comb = this.combinations(k + r - 1, k);
    return comb * Math.pow(p, r) * Math.pow(1 - p, k);
  }

  /** Coefficient of variation expressed as a ratio. */
  coefficientOfVariation(data: number[]): number {
    const summary = this.summary(data);
    if (summary.mean === 0) return 0;
    return summary.stdDev / Math.abs(summary.mean);
  }

  /** Z-score of a single observation relative to a sample. */
  zScore(value: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
  }

  /** Quantile lookup (linear interpolation) for a given percentile in [0, 1]. */
  percentile(data: number[], p: number): number {
    if (data.length === 0 || p < 0 || p > 1) return 0;
    const sorted = [...data].sort((a, b) => a - b);
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    const frac = idx - lo;
    return sorted[lo] * (1 - frac) + sorted[hi] * frac;
  }

  /** Sample standard deviation (Bessel-corrected). */
  sampleStdDev(data: number[]): number {
    if (data.length < 2) return 0;
    const mean = data.reduce((s, v) => s + v, 0) / data.length;
    const variance = data.reduce((s, v) => s + (v - mean) ** 2, 0) / (data.length - 1);
    return Math.sqrt(variance);
  }

  /** Compute simple moving average over a window. */
  movingAverage(data: number[], window: number): number[] {
    if (window <= 0 || data.length < window) return [];
    const result: number[] = [];
    for (let i = 0; i <= data.length - window; i++) {
      const slice = data.slice(i, i + window);
      const avg = slice.reduce((s, v) => s + v, 0) / window;
      result.push(avg);
    }
    this._history.push({ op: 'movingAverage', window });
    return result;
  }

  private _median(sorted: number[]): number {
    const n = sorted.length;
    if (n === 0) return 0;
    if (n % 2 === 0) return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    return sorted[Math.floor(n / 2)];
  }

  private _mode(data: number[]): number[] {
    const counts = new Map<number, number>();
    for (const v of data) counts.set(v, (counts.get(v) || 0) + 1);
    let max = 0;
    for (const c of counts.values()) if (c > max) max = c;
    if (max <= 1) return [];
    const modes: number[] = [];
    counts.forEach((c, v) => {
      if (c === max) modes.push(v);
    });
    return modes.sort((a, b) => a - b);
  }

  private _erf(x: number): number {
    // Abramowitz and Stegun formula 7.1.26
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  toPacket(): DataPacket<{
    probabilities: Probability[];
    distributions: Map<string, Distribution>;
    dataSets: number[][];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['high_school_math', 'ProbabilityStatistics'],
      priority: 1,
      phase: 'probability_statistics',
    };
    return {
      id: `probstat-${Date.now().toString(36)}`,
      payload: {
        probabilities: this._probabilities,
        distributions: this._distributions,
        dataSets: this._dataSets,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._probabilities = [];
    this._distributions = new Map();
    this._dataSets = [];
    this._history = [];
    this._counter = 0;
  }

  get probabilityCount(): number {
    return this._probabilities.length;
  }

  get distributionCount(): number {
    return this._distributions.size;
  }

  get dataSetCount(): number {
    return this._dataSets.length;
  }
}
