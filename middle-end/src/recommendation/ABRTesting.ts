import { DataPacket } from '../shared/types';

export interface ExperimentResult {
  name: string;
  control: string;
  treatment: string;
  metric: string;
  result: string;
}

export interface ABTest {
  name: string;
  control: number[];
  treatment: number[];
  metric: string;
  result: number;
}

export class ABRTesting {
  private _tests: ABTest[] = [];
  private _results: ExperimentResult[] = [];
  private _counter: number = 0;
  private _method: string = 'ab-test';
  private _lastResult: ExperimentResult | null = null;

  get tests(): ABTest[] {
    return this._tests;
  }

  get results(): ExperimentResult[] {
    return this._results;
  }

  get method(): string {
    return this._method;
  }

  abTest(control: number[], treatment: number[], metric: string): { pValue: number; significant: boolean; effect: number } {
    const controlMean = this._mean(control);
    const treatmentMean = this._mean(treatment);
    const effect = treatmentMean - controlMean;
    const pooledStd = this._pooledStd(control, treatment);
    const se = pooledStd * Math.sqrt(1 / control.length + 1 / treatment.length);
    const tStat = se > 0 ? effect / se : 0;
    const df = control.length + treatment.length - 2;
    const pValue = this._pValueFromT(tStat, df);
    const significant = pValue < 0.05;
    this._tests.push({
      name: metric,
      control,
      treatment,
      metric,
      result: effect
    });
    this._lastResult = {
      name: metric,
      control: controlMean.toFixed(4),
      treatment: treatmentMean.toFixed(4),
      metric,
      result: significant ? 'significant' : 'not-significant'
    };
    this._results.push(this._lastResult);
    this._method = 'ab-test';
    return { pValue, significant, effect };
  }

  splitTest(users: string[], groups: string[], metrics: Map<string, number[]>): Map<string, { group: string; metric: string; value: number }[]> {
    const result = new Map<string, { group: string; metric: string; value: number }[]>();
    const groupSize = Math.ceil(users.length / groups.length);
    for (let i = 0; i < users.length; i++) {
      const groupIdx = Math.floor(i / groupSize);
      const group = groups[Math.min(groupIdx, groups.length - 1)];
      const userResults: { group: string; metric: string; value: number }[] = [];
      for (const [metricName, values] of metrics) {
        userResults.push({
          group,
          metric: metricName,
          value: values[i % values.length] || 0
        });
      }
      result.set(users[i], userResults);
    }
    return result;
  }

  multivariableTest(factors: string[][], interactions: string[]): Map<string, number> {
    const combinations = this._cartesianProduct(factors);
    const results = new Map<string, number>();
    for (const combo of combinations) {
      const key = combo.join('-');
      let effect = 0;
      for (let i = 0; i < combo.length; i++) {
        effect += (i % 2 === 0 ? 1 : -1) * 0.1;
      }
      for (const interaction of interactions) {
        effect += 0.05;
      }
      results.set(key, effect);
    }
    return results;
  }

  bucketAllocation(users: string[], groups: string[], method: string = 'random'): Map<string, string> {
    const allocation = new Map<string, string>();
    const shuffled = [...users];
    if (method === 'random') {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    } else if (method === 'hash') {
      shuffled.sort((a, b) => this._hash(a) - this._hash(b));
    }
    const bucketSize = Math.ceil(users.length / groups.length);
    for (let i = 0; i < shuffled.length; i++) {
      const groupIdx = Math.floor(i / bucketSize);
      allocation.set(shuffled[i], groups[Math.min(groupIdx, groups.length - 1)]);
    }
    return allocation;
  }

  hypothesisTest(a: number[], b: number[], metric: string): { statistic: number; pValue: number } {
    const meanA = this._mean(a);
    const meanB = this._mean(b);
    const se = this._pooledStd(a, b) * Math.sqrt(1 / a.length + 1 / b.length);
    const tStat = se > 0 ? (meanB - meanA) / se : 0;
    const df = a.length + b.length - 2;
    const pValue = this._pValueFromT(tStat, df);
    return { statistic: tStat, pValue };
  }

  statisticalSignificance(results: { control: number; treatment: number }[]): boolean {
    let pValueSum = 0;
    for (const r of results) {
      pValueSum += r.treatment > r.control ? 0.04 : 0.5;
    }
    return pValueSum / results.length < 0.05;
  }

  confidenceInterval(metric: number[], confidence: number = 0.95): { lower: number; upper: number; mean: number } {
    const mean = this._mean(metric);
    const std = this._std(metric);
    const z = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.645;
    const se = std / Math.sqrt(metric.length);
    return {
      lower: mean - z * se,
      upper: mean + z * se,
      mean
    };
  }

  sampleSizeCalc(effect: number, power: number = 0.8, alpha: number = 0.05): number {
    const zAlpha = alpha === 0.05 ? 1.96 : 1.645;
    const zBeta = power === 0.8 ? 0.84 : power === 0.9 ? 1.28 : 0.52;
    const sd = 1;
    const n = 2 * Math.pow(((zAlpha + zBeta) * sd) / effect, 2);
    return Math.ceil(n);
  }

  powerAnalysis(effect: number, n: number, alpha: number = 0.05): number {
    const zAlpha = alpha === 0.05 ? 1.96 : 1.645;
    const se = Math.sqrt(2 / n);
    const zBeta = (effect / se) - zAlpha;
    return this._normalCdf(zBeta);
  }

  sequentialTesting(results: number[], peeking: number = 10): { stopped: boolean; atIndex: number } {
    const alpha = 0.05;
    const adjustedAlpha = alpha / peeking;
    for (let i = 1; i <= Math.min(peeking, results.length); i++) {
      const partial = results.slice(0, Math.ceil(i * results.length / peeking));
      const mean = this._mean(partial);
      const std = this._std(partial);
      const se = std / Math.sqrt(partial.length);
      const z = se > 0 ? mean / se : 0;
      const p = 2 * (1 - this._normalCdf(Math.abs(z)));
      if (p < adjustedAlpha) {
        return { stopped: true, atIndex: i };
      }
    }
    return { stopped: false, atIndex: results.length };
  }

  banditTest(arms: string[], rewards: number[][], algorithm: string = 'epsilon-greedy'): { arm: string; reward: number }[] {
    const cumulativeRewards = new Array(arms.length).fill(0);
    const counts = new Array(arms.length).fill(0);
    const results: { arm: string; reward: number }[] = [];
    const epsilon = 0.1;
    for (let t = 0; t < rewards.length; t++) {
      let chosenArm: number;
      if (algorithm === 'epsilon-greedy') {
        if (Math.random() < epsilon) {
          chosenArm = Math.floor(Math.random() * arms.length);
        } else {
          chosenArm = this._argMax(cumulativeRewards.map((r, i) => counts[i] > 0 ? r / counts[i] : 0));
        }
      } else if (algorithm === 'ucb') {
        const ucbValues = cumulativeRewards.map((r, i) => {
          if (counts[i] === 0) return Infinity;
          const mean = r / counts[i];
          const exploration = Math.sqrt(2 * Math.log(t + 1) / counts[i]);
          return mean + exploration;
        });
        chosenArm = this._argMax(ucbValues);
      } else {
        chosenArm = Math.floor(Math.random() * arms.length);
      }
      const reward = rewards[t][chosenArm] || 0;
      cumulativeRewards[chosenArm] += reward;
      counts[chosenArm]++;
      results.push({ arm: arms[chosenArm], reward });
    }
    return results;
  }

  private _mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private _std(arr: number[]): number {
    if (arr.length <= 1) return 0;
    const mean = this._mean(arr);
    const squaredDiffs = arr.map(x => (x - mean) ** 2);
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (arr.length - 1));
  }

  private _pooledStd(a: number[], b: number[]): number {
    const varA = this._std(a) ** 2;
    const varB = this._std(b) ** 2;
    const df = a.length + b.length - 2;
    if (df <= 0) return 0;
    return Math.sqrt(((a.length - 1) * varA + (b.length - 1) * varB) / df);
  }

  private _pValueFromT(t: number, df: number): number {
    const absT = Math.abs(t);
    const x = df / (df + absT * absT);
    const a = df / 2;
    const b = 0.5;
    const incompleteBeta = this._incompleteBeta(a, b, x);
    return 2 * (1 - incompleteBeta / this._beta(a, b));
  }

  private _beta(a: number, b: number): number {
    return this._gamma(a) * this._gamma(b) / this._gamma(a + b);
  }

  private _gamma(x: number): number {
    if (x === 1) return 1;
    if (x === 0.5) return Math.sqrt(Math.PI);
    return (x - 1) * this._gamma(x - 1);
  }

  private _incompleteBeta(a: number, b: number, x: number): number {
    let sum = 0;
    const n = 100;
    for (let i = 0; i <= n; i++) {
      const t = i / n * x;
      const dt = x / n;
      const f = Math.pow(t, a - 1) * Math.pow(1 - t, b - 1);
      sum += f * dt;
    }
    return sum;
  }

  private _normalCdf(x: number): number {
    return 0.5 * (1 + this._erf(x / Math.sqrt(2)));
  }

  private _erf(x: number): number {
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  private _argMax(arr: number[]): number {
    let maxIdx = 0;
    let maxVal = -Infinity;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] > maxVal) {
        maxVal = arr[i];
        maxIdx = i;
      }
    }
    return maxIdx;
  }

  private _cartesianProduct(arrays: string[][]): string[][] {
    if (arrays.length === 0) return [[]];
    const [first, ...rest] = arrays;
    const restProduct = this._cartesianProduct(rest);
    const result: string[][] = [];
    for (const item of first) {
      for (const combo of restProduct) {
        result.push([item, ...combo]);
      }
    }
    return result;
  }

  private _hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  toPacket(): DataPacket<ExperimentResult> {
    const result = this._lastResult || { name: '', control: '', treatment: '', metric: '', result: '' };
    this._counter++;
    return {
      id: `ab-test-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['recommendation', 'ab-testing'],
        priority: 1,
        phase: 'ab-testing'
      }
    };
  }

  reset(): void {
    this._tests = [];
    this._results = [];
    this._counter = 0;
    this._method = 'ab-test';
    this._lastResult = null;
  }
}
