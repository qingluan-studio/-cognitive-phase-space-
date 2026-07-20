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
    counts.forEach((c) => { if (c > max) max = c; });
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

  uniformDistribution(a: number, b: number, x: number): number {
    if (x < a || x > b) return 0;
    return 1 / (b - a);
  }

  uniformCDF(a: number, b: number, x: number): number {
    if (x < a) return 0;
    if (x > b) return 1;
    return (x - a) / (b - a);
  }

  uniformMean(a: number, b: number): number {
    return (a + b) / 2;
  }

  uniformVariance(a: number, b: number): number {
    return (b - a) * (b - a) / 12;
  }

  exponentialDistribution(lambda: number, x: number): number {
    if (x < 0 || lambda <= 0) return 0;
    return lambda * Math.exp(-lambda * x);
  }

  exponentialCDF(lambda: number, x: number): number {
    if (x < 0 || lambda <= 0) return 0;
    return 1 - Math.exp(-lambda * x);
  }

  exponentialMean(lambda: number): number {
    return lambda > 0 ? 1 / lambda : 0;
  }

  exponentialVariance(lambda: number): number {
    return lambda > 0 ? 1 / (lambda * lambda) : 0;
  }

  gammaDistribution(alpha: number, beta: number, x: number): number {
    if (x <= 0 || alpha <= 0 || beta <= 0) return 0;
    return Math.pow(x, alpha - 1) * Math.exp(-x / beta) / (this._gammaFunction(alpha) * Math.pow(beta, alpha));
  }

  gammaMean(alpha: number, beta: number): number {
    return alpha * beta;
  }

  gammaVariance(alpha: number, beta: number): number {
    return alpha * beta * beta;
  }

  private _gammaFunction(x: number): number {
    if (x <= 0) return Infinity;
    if (x === 1) return 1;
    if (x === 0.5) return Math.sqrt(Math.PI);
    if (x > 1) return (x - 1) * this._gammaFunction(x - 1);
    const p = [
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7,
    ];
    let y = x;
    let tmp = x + 7.5;
    let sum = 0.99999999999980993;
    for (let i = 0; i < p.length; i++) {
      sum += p[i] / (y + i);
    }
    return Math.sqrt(2 * Math.PI) * Math.pow(tmp, x - 0.5) * Math.exp(-tmp) * sum;
  }

  betaDistribution(alpha: number, beta: number, x: number): number {
    if (x < 0 || x > 1 || alpha <= 0 || beta <= 0) return 0;
    const B = this._gammaFunction(alpha) * this._gammaFunction(beta) / this._gammaFunction(alpha + beta);
    return Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1) / B;
  }

  betaMean(alpha: number, beta: number): number {
    return alpha / (alpha + beta);
  }

  betaVariance(alpha: number, beta: number): number {
    return (alpha * beta) / ((alpha + beta) * (alpha + beta) * (alpha + beta + 1));
  }

  chiSquaredDistribution(df: number, x: number): number {
    if (x <= 0 || df <= 0) return 0;
    return this.gammaDistribution(df / 2, 2, x);
  }

  chiSquaredCDF(df: number, x: number): number {
    if (x <= 0 || df <= 0) return 0;
    return this._regularizedLowerIncompleteGamma(df / 2, x / 2);
  }

  private _regularizedLowerIncompleteGamma(a: number, x: number): number {
    if (x < 0 || a <= 0) return 0;
    if (x === 0) return 0;
    if (x < a + 1) {
      let sum = 1 / a;
      let term = 1 / a;
      for (let n = 1; n < 100; n++) {
        term *= x / (a + n);
        sum += term;
        if (Math.abs(term) < Math.abs(sum) * 1e-12) break;
      }
      return sum * Math.exp(-x + a * Math.log(x) - this._logGamma(a));
    } else {
      let b = x + 1 - a;
      let c = Infinity;
      let d = 1 / b;
      let h = d;
      for (let i = 1; i < 100; i++) {
        const an = -i * (i - a);
        b += 2;
        d = an * d + b;
        if (Math.abs(d) < 1e-30) d = 1e-30;
        c = b + an / c;
        if (Math.abs(c) < 1e-30) c = 1e-30;
        d = 1 / d;
        const del = d * c;
        h *= del;
        if (Math.abs(del - 1) < 1e-12) break;
      }
      return 1 - Math.exp(-x + a * Math.log(x) - this._logGamma(a)) * h;
    }
  }

  private _logGamma(x: number): number {
    if (x <= 0) return Infinity;
    return Math.log(this._gammaFunction(x));
  }

  tDistribution(df: number, x: number): number {
    if (df <= 0) return 0;
    const coef = this._gammaFunction((df + 1) / 2) / (Math.sqrt(df * Math.PI) * this._gammaFunction(df / 2));
    return coef * Math.pow(1 + x * x / df, -(df + 1) / 2);
  }

  tCDF(df: number, x: number): number {
    if (df <= 0) return 0;
    if (x === 0) return 0.5;
    const xSq = x * x;
    const beta = this._regularizedIncompleteBeta(df / 2, 0.5, df / (df + xSq));
    if (x > 0) {
      return 1 - 0.5 * beta;
    } else {
      return 0.5 * beta;
    }
  }

  private _regularizedIncompleteBeta(a: number, b: number, x: number): number {
    if (x < 0 || x > 1 || a <= 0 || b <= 0) return 0;
    const bt = x === 0 || x === 1 ? 0 :
      Math.exp(this._logGamma(a + b) - this._logGamma(a) - this._logGamma(b) +
        a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) {
      return bt * this._betaCF(a, b, x) / a;
    } else {
      return 1 - bt * this._betaCF(b, a, 1 - x) / b;
    }
  }

  private _betaCF(a: number, b: number, x: number): number {
    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;
    let c = 1;
    let d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= 100; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-12) break;
    }
    return h;
  }

  fDistribution(df1: number, df2: number, x: number): number {
    if (x <= 0 || df1 <= 0 || df2 <= 0) return 0;
    const num = Math.pow(df1 * x, df1) * Math.pow(df2, df2);
    const den = Math.pow(df1 * x + df2, df1 + df2);
    const beta = this._gammaFunction(df1 / 2) * this._gammaFunction(df2 / 2) / this._gammaFunction((df1 + df2) / 2);
    return (1 / (x * beta)) * Math.sqrt(num / den);
  }

  fCDF(df1: number, df2: number, x: number): number {
    if (x <= 0 || df1 <= 0 || df2 <= 0) return 0;
    const k = (df1 * x) / (df1 * x + df2);
    return this._regularizedIncompleteBeta(df1 / 2, df2 / 2, k);
  }

  confidenceIntervalMean(data: number[], confidence: number = 0.95): { lower: number; upper: number; margin: number } {
    const n = data.length;
    if (n < 2) return { lower: 0, upper: 0, margin: 0 };
    const mean = data.reduce((s, v) => s + v, 0) / n;
    const stdDev = Math.sqrt(data.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
    const alpha = 1 - confidence;
    const z = this._inverseNormalCDF(1 - alpha / 2);
    const margin = z * stdDev / Math.sqrt(n);
    return { lower: mean - margin, upper: mean + margin, margin };
  }

  private _inverseNormalCDF(p: number): number {
    if (p <= 0 || p >= 1) return NaN;
    const a = [
      -3.969683028665376e+01,
      2.209460984245205e+02,
      -2.759285104469687e+02,
      1.383577518672690e+02,
      -3.066479806614716e+01,
      2.506628277459239e+00,
    ];
    const b = [
      -5.447609879822406e+01,
      1.615858368580409e+02,
      -1.556989798598866e+02,
      6.680131188771972e+01,
      -1.328068155288572e+01,
    ];
    const c = [
      -7.784894002430293e-03,
      -3.223964580411365e-01,
      -2.400758277161838e+00,
      -2.549732539343734e+00,
      4.374664141464968e+00,
      2.938163982698783e+00,
    ];
    const d = [
      7.784695709041462e-03,
      3.224671290700398e-01,
      2.445134137142996e+00,
      3.754408661907416e+00,
    ];
    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    let q, r;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
  }

  hypothesisTestZ(sampleMean: number, populationMean: number, populationStd: number, sampleSize: number, tails: 1 | 2 = 2): {
    zScore: number;
    pValue: number;
    significant: boolean;
    alpha: number;
  } {
    const se = populationStd / Math.sqrt(sampleSize);
    const z = (sampleMean - populationMean) / se;
    const p = 2 * (1 - this.normalProbability(Math.abs(z), 0, 1));
    const pValue = tails === 1 ? p / 2 : p;
    const alpha = 0.05;
    return { zScore: z, pValue, significant: pValue < alpha, alpha };
  }

  hypothesisTestT(data: number[], expectedMean: number, tails: 1 | 2 = 2): {
    tStatistic: number;
    pValue: number;
    df: number;
    significant: boolean;
    alpha: number;
  } {
    const n = data.length;
    const df = n - 1;
    if (df < 1) return { tStatistic: 0, pValue: 1, df, significant: false, alpha: 0.05 };
    const mean = data.reduce((s, v) => s + v, 0) / n;
    const stdDev = Math.sqrt(data.reduce((s, v) => s + (v - mean) ** 2, 0) / df);
    const se = stdDev / Math.sqrt(n);
    const t = (mean - expectedMean) / se;
    const p = 2 * (1 - this.tCDF(df, Math.abs(t)));
    const pValue = tails === 1 ? p / 2 : p;
    const alpha = 0.05;
    return { tStatistic: t, pValue, df, significant: pValue < alpha, alpha };
  }

  twoSampleTTest(data1: number[], data2: number[], tails: 1 | 2 = 2): {
    tStatistic: number;
    pValue: number;
    df: number;
    significant: boolean;
    alpha: number;
  } {
    const n1 = data1.length;
    const n2 = data2.length;
    const mean1 = data1.reduce((s, v) => s + v, 0) / n1;
    const mean2 = data2.reduce((s, v) => s + v, 0) / n2;
    const var1 = data1.reduce((s, v) => s + (v - mean1) ** 2, 0) / (n1 - 1);
    const var2 = data2.reduce((s, v) => s + (v - mean2) ** 2, 0) / (n2 - 1);
    const se = Math.sqrt(var1 / n1 + var2 / n2);
    const t = (mean1 - mean2) / se;
    const df = Math.floor((var1 / n1 + var2 / n2) ** 2 /
      ((var1 / n1) ** 2 / (n1 - 1) + (var2 / n2) ** 2 / (n2 - 1)));
    const p = 2 * (1 - this.tCDF(df, Math.abs(t)));
    const pValue = tails === 1 ? p / 2 : p;
    const alpha = 0.05;
    return { tStatistic: t, pValue, df, significant: pValue < alpha, alpha };
  }

  chiSquaredTest(observed: number[], expected: number[]): {
    chiSquared: number;
    df: number;
    pValue: number;
    significant: boolean;
    alpha: number;
  } {
    const df = observed.length - 1;
    let chiSq = 0;
    for (let i = 0; i < observed.length; i++) {
      if (expected[i] > 0) {
        chiSq += (observed[i] - expected[i]) ** 2 / expected[i];
      }
    }
    const pValue = 1 - this.chiSquaredCDF(df, chiSq);
    const alpha = 0.05;
    return { chiSquared: chiSq, df, pValue, significant: pValue < alpha, alpha };
  }

  anova(groups: number[][]): {
    fStatistic: number;
    pValue: number;
    dfBetween: number;
    dfWithin: number;
    significant: boolean;
    alpha: number;
  } {
    const k = groups.length;
    const allData = groups.flat();
    const grandMean = allData.reduce((s, v) => s + v, 0) / allData.length;
    let ssBetween = 0;
    let ssWithin = 0;
    let totalN = 0;
    for (const group of groups) {
      const n = group.length;
      totalN += n;
      const mean = group.reduce((s, v) => s + v, 0) / n;
      ssBetween += n * (mean - grandMean) ** 2;
      ssWithin += group.reduce((s, v) => s + (v - mean) ** 2, 0);
    }
    const dfBetween = k - 1;
    const dfWithin = totalN - k;
    const msBetween = ssBetween / dfBetween;
    const msWithin = ssWithin / dfWithin;
    const f = msBetween / msWithin;
    const pValue = 1 - this.fCDF(dfBetween, dfWithin, f);
    const alpha = 0.05;
    return { fStatistic: f, pValue, dfBetween, dfWithin, significant: pValue < alpha, alpha };
  }

  multipleLinearRegression(X: number[][], y: number[]): {
    coefficients: number[];
    residuals: number[];
    rSquared: number;
    adjustedRSquared: number;
    fStatistic: number;
    pValue: number;
  } {
    const n = y.length;
    const k = X[0].length;
    const Xt: number[][] = Array.from({ length: k }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < k; j++) {
        Xt[j][i] = X[i][j];
      }
    }
    const XtX: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        for (let l = 0; l < n; l++) {
          XtX[i][j] += Xt[i][l] * X[l][j];
        }
      }
    }
    const Xty: number[] = new Array(k).fill(0);
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < n; j++) {
        Xty[i] += Xt[i][j] * y[j];
      }
    }
    const coefficients = this._solveSystem(XtX, Xty);
    const residuals: number[] = [];
    let ssRes = 0;
    let ssTot = 0;
    const yMean = y.reduce((s, v) => s + v, 0) / n;
    for (let i = 0; i < n; i++) {
      let pred = 0;
      for (let j = 0; j < k; j++) pred += X[i][j] * coefficients[j];
      const res = y[i] - pred;
      residuals.push(res);
      ssRes += res * res;
      ssTot += (y[i] - yMean) ** 2;
    }
    const rSquared = 1 - ssRes / ssTot;
    const adjustedRSquared = 1 - (1 - rSquared) * (n - 1) / (n - k - 1);
    const msReg = (ssTot - ssRes) / k;
    const msRes = ssRes / (n - k - 1);
    const fStatistic = msReg / msRes;
    const pValue = 1 - this.fCDF(k, n - k - 1, fStatistic);
    return { coefficients, residuals, rSquared, adjustedRSquared, fStatistic, pValue };
  }

  private _solveSystem(A: number[][], b: number[]): number[] {
    const n = b.length;
    const augmented = A.map((row, i) => [...row, b[i]]);
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      const pivot = augmented[i][i];
      if (Math.abs(pivot) < 1e-12) continue;
      for (let j = i; j <= n; j++) augmented[i][j] /= pivot;
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i];
          for (let j = i; j <= n; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
    }
    return augmented.map(row => row[n]);
  }

  polynomialRegression(x: number[], y: number[], degree: number): {
    coefficients: number[];
    rSquared: number;
  } {
    const n = x.length;
    const X: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j <= degree; j++) {
        row.push(Math.pow(x[i], j));
      }
      X.push(row);
    }
    const result = this.multipleLinearRegression(X, y);
    return { coefficients: result.coefficients, rSquared: result.rSquared };
  }

  correlationMatrix(data: number[][]): number[][] {
    const n = data.length;
    const m = data[0].length;
    const means: number[] = new Array(m).fill(0);
    const stdDevs: number[] = new Array(m).fill(0);
    for (let j = 0; j < m; j++) {
      for (let i = 0; i < n; i++) means[j] += data[i][j];
      means[j] /= n;
      for (let i = 0; i < n; i++) stdDevs[j] += (data[i][j] - means[j]) ** 2;
      stdDevs[j] = Math.sqrt(stdDevs[j] / (n - 1));
    }
    const corr: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        if (i === j) {
          corr[i][j] = 1;
        } else {
          let sum = 0;
          for (let k = 0; k < n; k++) {
            sum += (data[k][i] - means[i]) * (data[k][j] - means[j]);
          }
          corr[i][j] = sum / ((n - 1) * stdDevs[i] * stdDevs[j]);
        }
      }
    }
    return corr;
  }

  covarianceMatrix(data: number[][]): number[][] {
    const n = data.length;
    const m = data[0].length;
    const means: number[] = new Array(m).fill(0);
    for (let j = 0; j < m; j++) {
      for (let i = 0; i < n; i++) means[j] += data[i][j];
      means[j] /= n;
    }
    const cov: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += (data[k][i] - means[i]) * (data[k][j] - means[j]);
        }
        cov[i][j] = sum / (n - 1);
      }
    }
    return cov;
  }

  skewness(data: number[]): number {
    const n = data.length;
    if (n < 3) return 0;
    const mean = data.reduce((s, v) => s + v, 0) / n;
    const stdDev = Math.sqrt(data.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
    if (stdDev < 1e-12) return 0;
    let sum = 0;
    for (const v of data) sum += ((v - mean) / stdDev) ** 3;
    return (n / ((n - 1) * (n - 2))) * sum;
  }

  kurtosis(data: number[]): number {
    const n = data.length;
    if (n < 4) return 0;
    const mean = data.reduce((s, v) => s + v, 0) / n;
    const stdDev = Math.sqrt(data.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
    if (stdDev < 1e-12) return 0;
    let sum = 0;
    for (const v of data) sum += ((v - mean) / stdDev) ** 4;
    return (n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))) * sum -
      3 * (n - 1) ** 2 / ((n - 2) * (n - 3));
  }

  moment(data: number[], k: number): number {
    const n = data.length;
    if (n === 0) return 0;
    const mean = data.reduce((s, v) => s + v, 0) / n;
    let sum = 0;
    for (const v of data) sum += (v - mean) ** k;
    return sum / n;
  }

  medianAbsoluteDeviation(data: number[]): number {
    const sorted = [...data].sort((a, b) => a - b);
    const median = this._median(sorted);
    const absDevs = data.map(v => Math.abs(v - median)).sort((a, b) => a - b);
    return this._median(absDevs) * 1.4826;
  }

  interquartileRange(data: number[]): number {
    const q = this.quartiles(data);
    return q.IQR;
  }

  outliersIQR(data: number[]): number[] {
    const q = this.quartiles(data);
    const lowerFence = q.Q1 - 1.5 * q.IQR;
    const upperFence = q.Q3 + 1.5 * q.IQR;
    return data.filter(v => v < lowerFence || v > upperFence);
  }

  outliersZScore(data: number[], threshold: number = 2): number[] {
    const summary = this.summary(data);
    return data.filter(v => Math.abs((v - summary.mean) / summary.stdDev) > threshold);
  }

  boxPlotStats(data: number[]): {
    min: number;
    Q1: number;
    median: number;
    Q3: number;
    max: number;
    outliers: number[];
  } {
    const sorted = [...data].sort((a, b) => a - b);
    const q = this.quartiles(data);
    const iqr = q.IQR;
    const lowerFence = q.Q1 - 1.5 * iqr;
    const upperFence = q.Q3 + 1.5 * iqr;
    const outliers = data.filter(v => v < lowerFence || v > upperFence);
    const whiskerMin = Math.min(...data.filter(v => v >= lowerFence));
    const whiskerMax = Math.max(...data.filter(v => v <= upperFence));
    return {
      min: whiskerMin,
      Q1: q.Q1,
      median: q.Q2,
      Q3: q.Q3,
      max: whiskerMax,
      outliers,
    };
  }

  monteCarloPi(iterations: number): { estimate: number; error: number; iterations: number } {
    let inside = 0;
    for (let i = 0; i < iterations; i++) {
      const x = Math.random();
      const y = Math.random();
      if (x * x + y * y <= 1) inside++;
    }
    const estimate = 4 * inside / iterations;
    return { estimate, error: Math.abs(estimate - Math.PI), iterations };
  }

  monteCarloIntegration(f: (x: number) => number, a: number, b: number, samples: number): {
    estimate: number;
    error: number;
    samples: number;
  } {
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < samples; i++) {
      const x = a + Math.random() * (b - a);
      const val = f(x);
      sum += val;
      sumSq += val * val;
    }
    const mean = sum / samples;
    const variance = sumSq / samples - mean * mean;
    const estimate = (b - a) * mean;
    const error = (b - a) * Math.sqrt(variance / samples);
    return { estimate, error, samples };
  }

  bootstrapMean(data: number[], iterations: number = 1000): {
    mean: number;
    stdError: number;
    confidenceInterval: [number, number];
    iterations: number;
  } {
    const n = data.length;
    const means: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const sample: number[] = [];
      for (let j = 0; j < n; j++) {
        sample.push(data[Math.floor(Math.random() * n)]);
      }
      means.push(sample.reduce((s, v) => s + v, 0) / n);
    }
    const mean = means.reduce((s, v) => s + v, 0) / iterations;
    const stdError = Math.sqrt(means.reduce((s, v) => s + (v - mean) ** 2, 0) / iterations);
    means.sort((a, b) => a - b);
    const lower = means[Math.floor(iterations * 0.025)];
    const upper = means[Math.floor(iterations * 0.975)];
    return { mean, stdError, confidenceInterval: [lower, upper], iterations };
  }

  permutationTest(data1: number[], data2: number[], iterations: number = 1000): {
    observedDiff: number;
    pValue: number;
    iterations: number;
  } {
    const mean1 = data1.reduce((s, v) => s + v, 0) / data1.length;
    const mean2 = data2.reduce((s, v) => s + v, 0) / data2.length;
    const observedDiff = Math.abs(mean1 - mean2);
    const combined = [...data1, ...data2];
    let count = 0;
    for (let i = 0; i < iterations; i++) {
      const shuffled = [...combined];
      for (let j = shuffled.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
      }
      const sample1 = shuffled.slice(0, data1.length);
      const sample2 = shuffled.slice(data1.length);
      const m1 = sample1.reduce((s, v) => s + v, 0) / sample1.length;
      const m2 = sample2.reduce((s, v) => s + v, 0) / sample2.length;
      if (Math.abs(m1 - m2) >= observedDiff) count++;
    }
    return { observedDiff, pValue: count / iterations, iterations };
  }

  bayesTheoremDetailed(prior: number, likelihood: number, marginalLikelihood: number): {
    posterior: number;
    prior: number;
    likelihood: number;
    marginalLikelihood: number;
  } {
    const posterior = (likelihood * prior) / marginalLikelihood;
    return { posterior, prior, likelihood, marginalLikelihood };
  }

  binomialTest(successes: number, trials: number, prob: number = 0.5): {
    pValue: number;
    confidenceInterval: [number, number];
    successes: number;
    trials: number;
    prob: number;
  } {
    const p = successes / trials;
    const se = Math.sqrt(p * (1 - p) / trials);
    const z = this._inverseNormalCDF(0.975);
    const lower = Math.max(0, p - z * se);
    const upper = Math.min(1, p + z * se);
    let pValue = 0;
    for (let k = 0; k <= trials; k++) {
      const probK = this.binomialProbability(trials, k, prob);
      if (probK <= this.binomialProbability(trials, successes, prob)) {
        pValue += probK;
      }
    }
    return { pValue, confidenceInterval: [lower, upper], successes, trials, prob };
  }

  poissonConfidenceInterval(events: number, confidence: number = 0.95): {
    lower: number;
    upper: number;
    events: number;
    confidence: number;
  } {
    const alpha = 1 - confidence;
    const lower = events === 0 ? 0 :
      0.5 * this._chiSquaredInverse(alpha / 2, 2 * events);
    const upper = 0.5 * this._chiSquaredInverse(1 - alpha / 2, 2 * (events + 1));
    return { lower, upper, events, confidence };
  }

  private _chiSquaredInverse(p: number, df: number): number {
    if (p <= 0 || p >= 1 || df <= 0) return NaN;
    let x = df;
    for (let i = 0; i < 100; i++) {
      const cdf = this.chiSquaredCDF(df, x);
      const pdf = this.chiSquaredDistribution(df, x);
      if (Math.abs(pdf) < 1e-12) break;
      const dx = (cdf - p) / pdf;
      x -= dx;
      if (Math.abs(dx) < 1e-10) break;
    }
    return Math.max(0, x);
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
