import { DataPacket, PacketMeta } from '../shared/types';

export interface TestResult {
  name: string;
  statistic: number;
  pValue: number;
  significant: boolean;
  method: string;
}

export interface HypothesisTest {
  nullHypothesis: string;
  alternativeHypothesis: string;
  alpha: number;
  result: TestResult;
}

export class StatisticalTests {
  private _testResults: TestResult[] = [];
  private _hypothesisTests: HypothesisTest[] = [];
  private _counter = 0;

  tTest(sample1: number[], sample2: number[], type: string = 'independent'): TestResult {
    if (type === 'paired') return this.pairedTTest(sample1, sample2);
    return this.independentTTest(sample1, sample2);
  }

  oneSampleTTest(sample: number[], mu: number): TestResult {
    const n = sample.length;
    if (n < 2) return { name: 'one_sample_t', statistic: 0, pValue: 1, significant: false, method: 'one-sample t-test' };
    const mean = sample.reduce((s, v) => s + v, 0) / n;
    const std = Math.sqrt(sample.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (n - 1));
    const se = std / Math.sqrt(n);
    const t = (mean - mu) / se;
    const df = n - 1;
    const p = this._tDistributionCDF(Math.abs(t), df) * 2;
    const result: TestResult = { name: 'one_sample_t', statistic: t, pValue: p, significant: p < 0.05, method: 'one-sample t-test' };
    this._testResults.push(result);
    return result;
  }

  independentTTest(sample1: number[], sample2: number[]): TestResult {
    const n1 = sample1.length, n2 = sample2.length;
    if (n1 < 2 || n2 < 2) return { name: 'independent_t', statistic: 0, pValue: 1, significant: false, method: 'independent t-test' };
    const mean1 = sample1.reduce((s, v) => s + v, 0) / n1;
    const mean2 = sample2.reduce((s, v) => s + v, 0) / n2;
    const var1 = sample1.reduce((s, v) => s + Math.pow(v - mean1, 2), 0) / (n1 - 1);
    const var2 = sample2.reduce((s, v) => s + Math.pow(v - mean2, 2), 0) / (n2 - 1);
    const se = Math.sqrt(var1 / n1 + var2 / n2);
    const t = (mean1 - mean2) / se;
    const dfWelch = Math.pow(var1 / n1 + var2 / n2, 2) / (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));
    const p = this._tDistributionCDF(Math.abs(t), dfWelch) * 2;
    const result: TestResult = { name: 'independent_t', statistic: t, pValue: p, significant: p < 0.05, method: 'Welch\'s t-test' };
    this._testResults.push(result);
    return result;
  }

  pairedTTest(sample1: number[], sample2: number[]): TestResult {
    const n = Math.min(sample1.length, sample2.length);
    if (n < 2) return { name: 'paired_t', statistic: 0, pValue: 1, significant: false, method: 'paired t-test' };
    const diffs = new Array(n).fill(0).map((_, i) => sample1[i] - sample2[i]);
    const meanD = diffs.reduce((s, v) => s + v, 0) / n;
    const stdD = Math.sqrt(diffs.reduce((s, v) => s + Math.pow(v - meanD, 2), 0) / (n - 1));
    const se = stdD / Math.sqrt(n);
    const t = meanD / se;
    const df = n - 1;
    const p = this._tDistributionCDF(Math.abs(t), df) * 2;
    const result: TestResult = { name: 'paired_t', statistic: t, pValue: p, significant: p < 0.05, method: 'paired t-test' };
    this._testResults.push(result);
    return result;
  }

  anova(groups: number[][], method: string = 'oneway'): TestResult {
    const k = groups.length;
    const allVals = groups.flat();
    const N = allVals.length;
    if (k < 2 || N < k) return { name: 'anova', statistic: 0, pValue: 1, significant: false, method: 'one-way ANOVA' };
    const grandMean = allVals.reduce((s, v) => s + v, 0) / N;
    let ssBetween = 0, ssWithin = 0;
    for (const group of groups) {
      const n = group.length;
      const gm = group.reduce((s, v) => s + v, 0) / n;
      ssBetween += n * Math.pow(gm - grandMean, 2);
      ssWithin += group.reduce((s, v) => s + Math.pow(v - gm, 2), 0);
    }
    const dfBetween = k - 1;
    const dfWithin = N - k;
    const msBetween = ssBetween / dfBetween;
    const msWithin = ssWithin / dfWithin;
    const f = msBetween / msWithin;
    const p = this._fDistributionCDF(f, dfBetween, dfWithin);
    const result: TestResult = { name: 'anova_f', statistic: f, pValue: p, significant: p < 0.05, method: 'one-way ANOVA' };
    this._testResults.push(result);
    return result;
  }

  chiSquareTest(observed: number[][], expected: number[][]): TestResult {
    let chi2 = 0;
    let df = 0;
    for (let i = 0; i < observed.length; i++) {
      for (let j = 0; j < observed[i].length; j++) {
        if (expected[i][j] > 0) {
          chi2 += Math.pow(observed[i][j] - expected[i][j], 2) / expected[i][j];
        }
      }
    }
    df = (observed.length - 1) * (observed[0]?.length - 1 || 1);
    const p = 1 - this._chiSquareCDF(chi2, df);
    const result: TestResult = { name: 'chi_square', statistic: chi2, pValue: p, significant: p < 0.05, method: 'chi-square test' };
    this._testResults.push(result);
    return result;
  }

  fisherExact(matrix: number[][]): TestResult {
    const a = matrix[0]?.[0] || 0, b = matrix[0]?.[1] || 0;
    const c = matrix[1]?.[0] || 0, d = matrix[1]?.[1] || 0;
    const total = a + b + c + d;
    if (total === 0) return { name: 'fisher_exact', statistic: 0, pValue: 1, significant: false, method: 'Fisher\'s exact test' };
    const factorial = (n: number): number => {
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    };
    const p = (factorial(a + b) * factorial(c + d) * factorial(a + c) * factorial(b + d))
      / (factorial(total) * factorial(a) * factorial(b) * factorial(c) * factorial(d));
    const result: TestResult = { name: 'fisher_exact', statistic: p, pValue: p, significant: p < 0.05, method: 'Fisher\'s exact test' };
    this._testResults.push(result);
    return result;
  }

  mannWhitneyU(sample1: number[], sample2: number[]): TestResult {
    const n1 = sample1.length, n2 = sample2.length;
    const combined = [...sample1.map(v => ({ v, g: 1 })), ...sample2.map(v => ({ v, g: 2 }))];
    combined.sort((a, b) => a.v - b.v);
    const ranks = new Array(combined.length).fill(0);
    let i = 0;
    while (i < combined.length) {
      let j = i;
      while (j < combined.length && combined[j].v === combined[i].v) j++;
      const avgRank = (i + j - 1) / 2 + 1;
      for (let k = i; k < j; k++) ranks[k] = avgRank;
      i = j;
    }
    let r1 = 0;
    for (let k = 0; k < combined.length; k++) {
      if (combined[k].g === 1) r1 += ranks[k];
    }
    const u1 = r1 - n1 * (n1 + 1) / 2;
    const u2 = n1 * n2 - u1;
    const u = Math.min(u1, u2);
    const mu = n1 * n2 / 2;
    const sigma = Math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12);
    const z = (u - mu) / sigma;
    const p = this._normalCDF(z) * 2;
    const result: TestResult = { name: 'mann_whitney_u', statistic: u, pValue: p, significant: p < 0.05, method: 'Mann-Whitney U' };
    this._testResults.push(result);
    return result;
  }

  wilcoxonSignedRank(sample1: number[], sample2: number[]): TestResult {
    const n = Math.min(sample1.length, sample2.length);
    if (n < 2) return { name: 'wilcoxon', statistic: 0, pValue: 1, significant: false, method: 'Wilcoxon signed-rank' };
    const diffs: { diff: number; rank: number }[] = [];
    for (let i = 0; i < n; i++) {
      const diff = sample1[i] - sample2[i];
      if (diff !== 0) diffs.push({ diff, rank: 0 });
    }
    diffs.sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));
    for (let i = 0; i < diffs.length; i++) diffs[i].rank = i + 1;
    let wPlus = 0, wMinus = 0;
    for (const d of diffs) {
      if (d.diff > 0) wPlus += d.rank;
      else wMinus += d.rank;
    }
    const w = Math.min(wPlus, wMinus);
    const nn = diffs.length;
    const mu = nn * (nn + 1) / 4;
    const sigma = Math.sqrt(nn * (nn + 1) * (2 * nn + 1) / 24);
    const z = (w - mu) / sigma;
    const p = this._normalCDF(z) * 2;
    const result: TestResult = { name: 'wilcoxon_w', statistic: w, pValue: p, significant: p < 0.05, method: 'Wilcoxon signed-rank' };
    this._testResults.push(result);
    return result;
  }

  kruskalWallis(groups: number[][]): TestResult {
    const allVals: { v: number; g: number }[] = [];
    groups.forEach((group, gi) => group.forEach(v => allVals.push({ v, g: gi })));
    const N = allVals.length;
    const k = groups.length;
    if (N < k) return { name: 'kruskal_wallis_h', statistic: 0, pValue: 1, significant: false, method: 'Kruskal-Wallis H' };
    allVals.sort((a, b) => a.v - b.v);
    const ranks = new Array(N).fill(0);
    let i = 0;
    while (i < N) {
      let j = i;
      while (j < N && allVals[j].v === allVals[i].v) j++;
      const avgRank = (i + j - 1) / 2 + 1;
      for (let kk = i; kk < j; kk++) ranks[kk] = avgRank;
      i = j;
    }
    const groupRanks: number[] = new Array(k).fill(0);
    const groupSizes: number[] = new Array(k).fill(0);
    for (let idx = 0; idx < N; idx++) {
      groupRanks[allVals[idx].g] += ranks[idx];
      groupSizes[allVals[idx].g]++;
    }
    let h = 12 / (N * (N + 1));
    let sum = 0;
    for (let g = 0; g < k; g++) {
      if (groupSizes[g] > 0) sum += Math.pow(groupRanks[g], 2) / groupSizes[g];
    }
    h *= sum;
    h -= 3 * (N + 1);
    const df = k - 1;
    const p = 1 - this._chiSquareCDF(h, df);
    const result: TestResult = { name: 'kruskal_wallis_h', statistic: h, pValue: p, significant: p < 0.05, method: 'Kruskal-Wallis H' };
    this._testResults.push(result);
    return result;
  }

  correlationTest(x: number[], y: number[], method: string = 'pearson'): TestResult {
    const n = Math.min(x.length, y.length);
    if (n < 3) return { name: 'correlation', statistic: 0, pValue: 1, significant: false, method };
    const meanX = x.reduce((s, v) => s + v, 0) / n;
    const meanY = y.reduce((s, v) => s + v, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    const r = num / Math.sqrt(denX * denY);
    const t = r * Math.sqrt((n - 2) / (1 - r * r));
    const p = this._tDistributionCDF(Math.abs(t), n - 2) * 2;
    const result: TestResult = { name: 'correlation_r', statistic: r, pValue: p, significant: p < 0.05, method };
    this._testResults.push(result);
    return result;
  }

  regressionSlopeTest(x: number[], y: number[]): TestResult {
    const n = Math.min(x.length, y.length);
    if (n < 3) return { name: 'slope_t', statistic: 0, pValue: 1, significant: false, method: 'regression slope test' };
    const meanX = x.reduce((s, v) => s + v, 0) / n;
    const meanY = y.reduce((s, v) => s + v, 0) / n;
    let ssXY = 0, ssXX = 0;
    for (let i = 0; i < n; i++) {
      ssXY += (x[i] - meanX) * (y[i] - meanY);
      ssXX += Math.pow(x[i] - meanX, 2);
    }
    const slope = ssXY / ssXX;
    const intercept = meanY - slope * meanX;
    let ssRes = 0;
    for (let i = 0; i < n; i++) {
      const pred = intercept + slope * x[i];
      ssRes += Math.pow(y[i] - pred, 2);
    }
    const se = Math.sqrt(ssRes / (n - 2) / ssXX);
    const t = slope / se;
    const p = this._tDistributionCDF(Math.abs(t), n - 2) * 2;
    const result: TestResult = { name: 'slope_t', statistic: t, pValue: p, significant: p < 0.05, method: 'regression slope test' };
    this._testResults.push(result);
    return result;
  }

  normalityTest(sample: number[], method: string = 'shapiro'): TestResult {
    const n = sample.length;
    if (n < 3) return { name: 'normality', statistic: 0, pValue: 1, significant: false, method };
    const sorted = [...sample].sort((a, b) => a - b);
    const mean = sorted.reduce((s, v) => s + v, 0) / n;
    const std = Math.sqrt(sorted.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (n - 1));
    const skewness = sorted.reduce((s, v) => s + Math.pow((v - mean) / std, 3), 0) * n / ((n - 1) * (n - 2));
    const kurt = sorted.reduce((s, v) => s + Math.pow((v - mean) / std, 4), 0) * n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))
      - 3 * (n - 1) * (n - 1) / ((n - 2) * (n - 3));
    const w = skewness * skewness + kurt * kurt / 4;
    const p = 1 - this._chiSquareCDF(w, 2);
    const result: TestResult = { name: 'normality', statistic: w, pValue: p, significant: p < 0.05, method };
    this._testResults.push(result);
    return result;
  }

  homogeneityVariance(groups: number[][], method: string = 'levene'): TestResult {
    const allVals = groups.flat();
    const k = groups.length;
    const N = allVals.length;
    if (k < 2) return { name: 'levene', statistic: 0, pValue: 1, significant: false, method };
    const groupMeans = groups.map(g => g.reduce((s, v) => s + v, 0) / g.length);
    const absDiffs: number[][] = groups.map((g, i) => g.map(v => Math.abs(v - groupMeans[i])));
    const grandMean = absDiffs.flat().reduce((s, v) => s + v, 0) / N;
    let ssBetween = 0, ssWithin = 0;
    for (let i = 0; i < k; i++) {
      const gm = absDiffs[i].reduce((s, v) => s + v, 0) / absDiffs[i].length;
      ssBetween += absDiffs[i].length * Math.pow(gm - grandMean, 2);
      ssWithin += absDiffs[i].reduce((s, v) => s + Math.pow(v - gm, 2), 0);
    }
    const f = (ssBetween / (k - 1)) / (ssWithin / (N - k));
    const p = this._fDistributionCDF(f, k - 1, N - k);
    const result: TestResult = { name: 'levene_f', statistic: f, pValue: p, significant: p < 0.05, method };
    this._testResults.push(result);
    return result;
  }

  private _tDistributionCDF(t: number, df: number): number {
    const x = df / (df + t * t);
    return this._incompleteBeta(df / 2, 0.5, x) / 2;
  }

  private _normalCDF(z: number): number {
    return 0.5 * (1 + this._erf(z / Math.sqrt(2)));
  }

  private _erf(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x);
    const t = 1 / (1 + p * ax);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
    return sign * y;
  }

  private _chiSquareCDF(x: number, k: number): number {
    if (x <= 0) return 0;
    return this._incompleteGamma(k / 2, x / 2);
  }

  private _incompleteGamma(a: number, x: number): number {
    if (x < 0) return 0;
    let sum = 0;
    let term = 1 / a;
    for (let n = 0; n < 100; n++) {
      sum += term;
      term *= x / (a + n + 1);
      if (Math.abs(term) < 1e-10) break;
    }
    return Math.exp(-x + a * Math.log(x) - this._logGamma(a)) * sum;
  }

  private _incompleteBeta(a: number, b: number, x: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(this._logGamma(a + b) - this._logGamma(a) - this._logGamma(b)
      + a * Math.log(x) + b * Math.log(1 - x));
    return bt * this._incompleteBetaCF(a, b, x);
  }

  private _incompleteBetaCF(a: number, b: number, x: number): number {
    const maxIter = 200;
    const eps = 1e-10;
    let bp = 1, bm = 1;
    let cp = 1, cm = 1;
    let d = 0;
    for (let m = 0; m < maxIter; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((a + m2) * (a + m2 + 1));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      cp = 1 + aa / cp;
      if (Math.abs(cp) < 1e-30) cp = 1e-30;
      d = 1 / d;
      bp *= d * cp;
      aa = -(a + m) * (a + b + m) * x / ((a + m2 + 1) * (a + m2 + 2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      cm = 1 + aa / cm;
      if (Math.abs(cm) < 1e-30) cm = 1e-30;
      d = 1 / d;
      bm *= d * cm;
      if (Math.abs(bp / bm - 1) < eps) break;
    }
    return bp / bm;
  }

  private _fDistributionCDF(f: number, d1: number, d2: number): number {
    const x = d1 * f / (d2 + d1 * f);
    return this._incompleteBeta(d1 / 2, d2 / 2, x);
  }

  private _logGamma(x: number): number {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) ser += c[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }

  toPacket(): DataPacket<{
    testResults: TestResult[];
    hypothesisTests: HypothesisTest[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['data_science', 'StatisticalTests'],
      priority: 1,
      phase: 'statistical_tests',
    };
    return {
      id: `statistical-tests-${Date.now().toString(36)}`,
      payload: {
        testResults: this._testResults,
        hypothesisTests: this._hypothesisTests,
      },
      metadata,
    };
  }

  reset(): void {
    this._testResults = [];
    this._hypothesisTests = [];
    this._counter = 0;
  }

  get testResultCount(): number { return this._testResults.length; }
  get hypothesisTestCount(): number { return this._hypothesisTests.length; }
}
