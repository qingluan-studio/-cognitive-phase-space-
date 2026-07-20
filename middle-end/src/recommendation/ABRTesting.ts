import { DataPacket, PacketMeta } from '../shared/types';

export interface ExperimentResult {
  name: string;
  control: string;
  treatment: string;
  metric: string;
  result: string;
  effectSize: number;
  pValue: number;
  sampleSize: number;
  duration: number;
  timestamp: number;
}

export interface ABTest {
  name: string;
  control: number[];
  treatment: number[];
  metric: string;
  result: number;
  startDate: number;
  endDate: number;
  status: 'running' | 'completed' | 'stopped';
}

export interface ExperimentDesign {
  name: string;
  type: 'ab' | 'multivariate' | 'bandit' | 'switchback';
  hypothesis: string;
  primaryMetric: string;
  secondaryMetrics: string[];
  minSampleSize: number;
  maxDuration: number;
  trafficAllocation: number;
}

export interface GuardrailMetric {
  name: string;
  threshold: number;
  currentValue: number;
  breached: boolean;
}

export class ABRTesting {
  private _tests: ABTest[] = [];
  private _results: ExperimentResult[] = [];
  private _counter: number = 0;
  private _method: string = 'ab-test';
  private _lastResult: ExperimentResult | null = null;
  private _experimentDesigns: ExperimentDesign[] = [];
  private _guardrails: GuardrailMetric[] = [];
  private _history: unknown[] = [];

  get tests(): ABTest[] { return this._tests; }
  get results(): ExperimentResult[] { return this._results; }
  get method(): string { return this._method; }
  get experimentDesignCount(): number { return this._experimentDesigns.length; }
  get guardrailCount(): number { return this._guardrails.length; }

  abTest(control: number[], treatment: number[], metric: string): { pValue: number; significant: boolean; effect: number; ci95: [number, number] } {
    const controlMean = this._mean(control);
    const treatmentMean = this._mean(treatment);
    const effect = treatmentMean - controlMean;
    const pooledStd = this._pooledStd(control, treatment);
    const se = pooledStd * Math.sqrt(1 / control.length + 1 / treatment.length);
    const tStat = se > 0 ? effect / se : 0;
    const df = control.length + treatment.length - 2;
    const pValue = this._pValueFromT(tStat, df);
    const significant = pValue < 0.05;
    const ci95: [number, number] = [effect - 1.96 * se, effect + 1.96 * se];
    this._tests.push({
      name: metric,
      control,
      treatment,
      metric,
      result: effect,
      startDate: Date.now(),
      endDate: Date.now(),
      status: 'completed',
    });
    this._lastResult = {
      name: metric,
      control: controlMean.toFixed(4),
      treatment: treatmentMean.toFixed(4),
      metric,
      result: significant ? 'significant' : 'not-significant',
      effectSize: Number(effect.toFixed(4)),
      pValue: Number(pValue.toFixed(4)),
      sampleSize: control.length + treatment.length,
      duration: 0,
      timestamp: Date.now(),
    };
    this._results.push(this._lastResult);
    this._method = 'ab-test';
    this._history.push({ op: 'abTest', metric, significant, sampleSize: control.length + treatment.length });
    return { pValue, significant, effect, ci95: [Number(ci95[0].toFixed(4)), Number(ci95[1].toFixed(4))] };
  }

  splitTest(users: string[], groups: string[], metrics: Map<string, number[]>): Map<string, { group: string; metric: string; value: number }[]> {
    const result = new Map<string, { group: string; metric: string; value: number }[]>();
    const groupSize = Math.ceil(users.length / groups.length);
    for (let i = 0; i < users.length; i++) {
      const groupIdx = Math.floor(i / groupSize);
      const group = groups[Math.min(groupIdx, groups.length - 1)];
      const userResults: { group: string; metric: string; value: number }[] = [];
      for (const [metricName, values] of metrics) {
        userResults.push({ group, metric: metricName, value: values[i % values.length] || 0 });
      }
      result.set(users[i], userResults);
    }
    this._history.push({ op: 'splitTest', userCount: users.length, groupCount: groups.length });
    return result;
  }

  multivariableTest(factors: string[][], interactions: string[], sampleSize: number = 1000): Map<string, number> {
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
      results.set(key, Number(effect.toFixed(4)));
    }
    this._history.push({ op: 'multivariableTest', combinationCount: combinations.length, sampleSize });
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
    } else if (method === 'stratified') {
      shuffled.sort((a, b) => a.localeCompare(b));
    }
    const bucketSize = Math.ceil(users.length / groups.length);
    for (let i = 0; i < shuffled.length; i++) {
      const groupIdx = Math.floor(i / bucketSize);
      allocation.set(shuffled[i], groups[Math.min(groupIdx, groups.length - 1)]);
    }
    this._history.push({ op: 'bucketAllocation', userCount: users.length, method });
    return allocation;
  }

  hypothesisTest(a: number[], b: number[], metric: string, testType: 't-test' | 'mann-whitney' = 't-test'): { statistic: number; pValue: number; significant: boolean } {
    const meanA = this._mean(a);
    const meanB = this._mean(b);
    const se = this._pooledStd(a, b) * Math.sqrt(1 / a.length + 1 / b.length);
    const tStat = se > 0 ? (meanB - meanA) / se : 0;
    const df = a.length + b.length - 2;
    const pValue = this._pValueFromT(tStat, df);
    this._history.push({ op: 'hypothesisTest', metric, testType, pValue });
    return { statistic: tStat, pValue, significant: pValue < 0.05 };
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
      lower: Number((mean - z * se).toFixed(4)),
      upper: Number((mean + z * se).toFixed(4)),
      mean: Number(mean.toFixed(4)),
    };
  }

  sampleSizeCalc(effect: number, power: number = 0.8, alpha: number = 0.05, baselineStd: number = 1): number {
    const zAlpha = alpha === 0.05 ? 1.96 : 1.645;
    const zBeta = power === 0.8 ? 0.84 : power === 0.9 ? 1.28 : 0.52;
    const n = 2 * Math.pow(((zAlpha + zBeta) * baselineStd) / effect, 2);
    return Math.ceil(n);
  }

  powerAnalysis(effect: number, n: number, alpha: number = 0.05): number {
    const zAlpha = alpha === 0.05 ? 1.96 : 1.645;
    const se = Math.sqrt(2 / n);
    const zBeta = (effect / se) - zAlpha;
    return Number(this._normalCdf(zBeta).toFixed(4));
  }

  sequentialTesting(results: number[], peeking: number = 10, alpha: number = 0.05): { stopped: boolean; atIndex: number; adjustedAlpha: number } {
    const adjustedAlpha = alpha / peeking;
    for (let i = 1; i <= Math.min(peeking, results.length); i++) {
      const partial = results.slice(0, Math.ceil(i * results.length / peeking));
      const mean = this._mean(partial);
      const std = this._std(partial);
      const se = std / Math.sqrt(partial.length);
      const z = se > 0 ? mean / se : 0;
      const p = 2 * (1 - this._normalCdf(Math.abs(z)));
      if (p < adjustedAlpha) {
        return { stopped: true, atIndex: i, adjustedAlpha };
      }
    }
    return { stopped: false, atIndex: results.length, adjustedAlpha };
  }

  banditTest(arms: string[], rewards: number[][], algorithm: string = 'epsilon-greedy'): { arm: string; reward: number; cumulativeReward: number }[] {
    const cumulativeRewards = new Array(arms.length).fill(0);
    const counts = new Array(arms.length).fill(0);
    const results: { arm: string; reward: number; cumulativeReward: number }[] = [];
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
      } else if (algorithm === 'thompson') {
        const samples = cumulativeRewards.map((r, i) => {
          const alpha = 1 + (counts[i] > 0 ? r : 0);
          const beta = 1 + (counts[i] > 0 ? counts[i] - r : 0);
          return Math.random() * alpha / (alpha + beta);
        });
        chosenArm = this._argMax(samples);
      } else {
        chosenArm = Math.floor(Math.random() * arms.length);
      }
      const reward = rewards[t][chosenArm] || 0;
      cumulativeRewards[chosenArm] += reward;
      counts[chosenArm]++;
      results.push({ arm: arms[chosenArm], reward, cumulativeReward: cumulativeRewards[chosenArm] });
    }
    this._history.push({ op: 'banditTest', algorithm, iterations: rewards.length });
    return results;
  }

  switchbackTest(periods: number, treatmentEffect: number, controlEffect: number, noise: number = 0.1): { period: number; assignment: string; outcome: number }[] {
    const results: { period: number; assignment: string; outcome: number }[] = [];
    for (let i = 0; i < periods; i++) {
      const assignment = i % 2 === 0 ? 'control' : 'treatment';
      const base = assignment === 'treatment' ? treatmentEffect : controlEffect;
      const outcome = base + (Math.random() - 0.5) * noise;
      results.push({ period: i, assignment, outcome: Number(outcome.toFixed(4)) });
    }
    this._history.push({ op: 'switchbackTest', periods, treatmentEffect });
    return results;
  }

  factorialTest(factors: Record<string, string[]>, outcomes: Map<string, number>): { mainEffects: Record<string, number>; interactions: Record<string, number> } {
    const mainEffects: Record<string, number> = {};
    const interactions: Record<string, number> = {};
    for (const [factor, levels] of Object.entries(factors)) {
      const levelEffects = levels.map(level => {
        const key = `${factor}=${level}`;
        return outcomes.get(key) || 0;
      });
      const meanEffect = levelEffects.reduce((a, b) => a + b, 0) / levelEffects.length;
      mainEffects[factor] = Number(meanEffect.toFixed(4));
    }
    const factorNames = Object.keys(factors);
    for (let i = 0; i < factorNames.length; i++) {
      for (let j = i + 1; j < factorNames.length; j++) {
        const interactionKey = `${factorNames[i]}*${factorNames[j]}`;
        interactions[interactionKey] = Number(((mainEffects[factorNames[i]] || 0) * (mainEffects[factorNames[j]] || 0)).toFixed(4));
      }
    }
    this._history.push({ op: 'factorialTest', factorCount: factorNames.length });
    return { mainEffects, interactions };
  }

  earlyStopping(liftSoFar: number[], minDetectableEffect: number, maxSample: number): { stop: boolean; reason: string; currentPower: number } {
    const currentN = liftSoFar.length;
    const currentStd = this._std(liftSoFar);
    const currentPower = this.powerAnalysis(minDetectableEffect, currentN);
    if (currentN >= maxSample) return { stop: true, reason: 'max-sample-reached', currentPower };
    if (currentPower >= 0.8) return { stop: true, reason: 'sufficient-power', currentPower };
    if (Math.abs(this._mean(liftSoFar)) > minDetectableEffect * 2 && currentN > maxSample * 0.3) {
      return { stop: true, reason: 'large-effect-detected', currentPower };
    }
    return { stop: false, reason: 'continue', currentPower };
  }

  guardrailCheck(metrics: GuardrailMetric[]): { allClear: boolean; breaches: GuardrailMetric[] } {
    const breaches = metrics.filter(m => m.breached);
    this._guardrails.push(...metrics);
    this._history.push({ op: 'guardrailCheck', breachCount: breaches.length });
    return { allClear: breaches.length === 0, breaches };
  }

  trafficAllocation(totalTraffic: number, experiments: { name: string; allocation: number }[]): Map<string, number> {
    const allocation = new Map<string, number>();
    let allocated = 0;
    for (const exp of experiments) {
      const traffic = Math.floor(totalTraffic * exp.allocation);
      allocation.set(exp.name, traffic);
      allocated += traffic;
    }
    allocation.set('control', totalTraffic - allocated);
    this._history.push({ op: 'trafficAllocation', experimentCount: experiments.length });
    return allocation;
  }

  cannibalizationDetection(experimentA: string[], experimentB: string[], overlapThreshold: number = 0.3): { cannibalization: boolean; overlapRate: number; severity: string } {
    const setA = new Set(experimentA);
    const overlap = experimentB.filter(u => setA.has(u)).length;
    const overlapRate = experimentB.length > 0 ? overlap / experimentB.length : 0;
    const cannibalization = overlapRate > overlapThreshold;
    const severity = overlapRate > 0.5 ? 'high' : overlapRate > 0.3 ? 'moderate' : 'low';
    this._history.push({ op: 'cannibalizationDetection', overlapRate });
    return { cannibalization, overlapRate: Number(overlapRate.toFixed(2)), severity };
  }

  experimentInteraction(experiments: { name: string; users: string[]; effect: number }[]): { interactionMatrix: number[][]; significantInteractions: { exp1: string; exp2: string; interaction: number }[] } {
    const n = experiments.length;
    const interactionMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const significantInteractions: { exp1: string; exp2: string; interaction: number }[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const setI = new Set(experiments[i].users);
        const overlap = experiments[j].users.filter(u => setI.has(u)).length;
        const interaction = overlap > 0 ? (experiments[i].effect + experiments[j].effect) * overlap / Math.min(experiments[i].users.length, experiments[j].users.length) : 0;
        interactionMatrix[i][j] = Number(interaction.toFixed(4));
        interactionMatrix[j][i] = Number(interaction.toFixed(4));
        if (Math.abs(interaction) > 0.1) {
          significantInteractions.push({ exp1: experiments[i].name, exp2: experiments[j].name, interaction: Number(interaction.toFixed(4)) });
        }
      }
    }
    this._history.push({ op: 'experimentInteraction', experimentCount: n });
    return { interactionMatrix, significantInteractions };
  }

  multipleTestingCorrection(pValues: number[], method: 'bonferroni' | 'fdr' = 'bonferroni'): number[] {
    if (method === 'bonferroni') {
      return pValues.map(p => Math.min(1, p * pValues.length));
    } else {
      const sorted = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
      const corrected = new Array(pValues.length).fill(0);
      for (let i = 0; i < sorted.length; i++) {
        corrected[sorted[i].i] = Math.min(1, sorted[i].p * pValues.length / (i + 1));
      }
      return corrected;
    }
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
    return Math.exp(-0.717 * absT - 0.416 * absT * absT);
  }

  private _normalCdf(x: number): number {
    return 0.5 * (1 + this._erf(x / Math.sqrt(2)));
  }

  private _erf(x: number): number {
    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1 / (1 + p * absX);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    return sign * y;
  }

  private _argMax(arr: number[]): number {
    let maxIdx = 0;
    let maxVal = -Infinity;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] > maxVal) { maxVal = arr[i]; maxIdx = i; }
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

  /** Compute the minimum detectable effect for a given sample size. */
  minimumDetectableEffect(n: number, alpha: number = 0.05, power: number = 0.8, std: number = 1): number {
    const zAlpha = alpha === 0.05 ? 1.96 : 1.645;
    const zBeta = power === 0.8 ? 0.84 : 1.28;
    return Number(((zAlpha + zBeta) * std * Math.sqrt(2 / n)).toFixed(4));
  }

  /** Compute the expected experiment duration. */
  expectedDuration(dailyTraffic: number, sampleSize: number, trafficAllocation: number = 1): number {
    return Math.ceil(sampleSize / (dailyTraffic * trafficAllocation));
  }

  /** Compute the false discovery rate. */
  falseDiscoveryRate(rejections: number, falseRejections: number): number {
    return rejections > 0 ? Number((falseRejections / rejections).toFixed(4)) : 0;
  }

  /** Compute the false negative rate. */
  falseNegativeRate(trueEffects: number, missedEffects: number): number {
    return trueEffects > 0 ? Number((missedEffects / trueEffects).toFixed(4)) : 0;
  }

  /** Compute the experiment sensitivity. */
  sensitivity(truePositives: number, falseNegatives: number): number {
    const total = truePositives + falseNegatives;
    return total > 0 ? Number((truePositives / total).toFixed(4)) : 0;
  }

  /** Compute the experiment specificity. */
  specificity(trueNegatives: number, falsePositives: number): number {
    const total = trueNegatives + falsePositives;
    return total > 0 ? Number((trueNegatives / total).toFixed(4)) : 0;
  }

  toPacket(): DataPacket<{
    tests: number;
    results: number;
    method: string;
    experimentDesigns: number;
    guardrails: number;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['recommendation', 'ABRTesting'],
      priority: 1,
      phase: 'ab-testing',
    };
    return {
      id: `ab-testing-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        tests: this._tests.length,
        results: this._results.length,
        method: this._method,
        experimentDesigns: this._experimentDesigns.length,
        guardrails: this._guardrails.length,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._tests = [];
    this._results = [];
    this._counter = 0;
    this._method = 'ab-test';
    this._lastResult = null;
    this._experimentDesigns = [];
    this._guardrails = [];
    this._history = [];
  }
}
